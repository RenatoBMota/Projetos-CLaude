package com.rbm.agendamento.application.service;

import com.rbm.agendamento.config.AppProperties;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MinioService {

    private final MinioClient minioClient;
    private final AppProperties appProperties;

    public void upload(String bucket, String objectName, InputStream inputStream,
                       long size, String contentType) {
        try {
            garantirBucketExiste(bucket);
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(inputStream, size, -1)
                    .contentType(contentType)
                    .build());
            log.debug("Arquivo enviado ao MinIO: {}/{}", bucket, objectName);
        } catch (Exception e) {
            log.error("Erro ao enviar arquivo ao MinIO: {}", e.getMessage());
            throw new RuntimeException("Falha ao armazenar arquivo: " + e.getMessage(), e);
        }
    }

    public InputStream download(String bucket, String objectName) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            log.error("Erro ao baixar arquivo do MinIO: {}", e.getMessage());
            throw new RuntimeException("Arquivo não encontrado: " + e.getMessage(), e);
        }
    }

    public String gerarUrlPresignada(String bucket, String objectName, int expiracaoMinutos) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(objectName)
                    .expiry(expiracaoMinutos, TimeUnit.MINUTES)
                    .build());
        } catch (Exception e) {
            log.error("Erro ao gerar URL presignada: {}", e.getMessage());
            throw new RuntimeException("Falha ao gerar URL de acesso: " + e.getMessage(), e);
        }
    }

    public void excluir(String bucket, String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .build());
            log.debug("Arquivo removido do MinIO: {}/{}", bucket, objectName);
        } catch (Exception e) {
            log.warn("Falha ao remover arquivo do MinIO {}/{}: {}", bucket, objectName, e.getMessage());
        }
    }

    public String getBucketDocumentos() {
        return appProperties.minio().bucketDocuments();
    }

    private void garantirBucketExiste(String bucket) {
        try {
            boolean existe = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!existe) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Bucket criado: {}", bucket);
            }
        } catch (Exception e) {
            log.warn("Não foi possível verificar/criar bucket {}: {}", bucket, e.getMessage());
        }
    }
}
