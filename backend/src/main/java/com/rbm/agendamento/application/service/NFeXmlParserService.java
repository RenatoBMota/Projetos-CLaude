package com.rbm.agendamento.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.Optional;

@Slf4j
@Service
public class NFeXmlParserService {

    public record DadosNFe(
            String chaveAcesso,
            String numero,
            String serie,
            String emitente,
            String emitenteDocumento,
            String destinatario,
            String destinatarioDocumento,
            BigDecimal valorTotal,
            BigDecimal pesoBruto,
            BigDecimal pesoLiquido,
            Integer volumes,
            String tipo
    ) {}

    public Optional<DadosNFe> parsear(byte[] xmlBytes, String tipoDocumento) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(xmlBytes));
            doc.getDocumentElement().normalize();

            if (tipoDocumento != null && tipoDocumento.startsWith("CTE")) {
                return parsearCTe(doc);
            }
            return parsearNFe(doc);
        } catch (Exception e) {
            log.warn("Não foi possível parsear XML ({}): {}", tipoDocumento, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<DadosNFe> parsearNFe(Document doc) {
        try {
            String chave = extrairChave(doc, "chNFe");
            if (chave == null) {
                // Try from infNFe Id attribute
                chave = extrairAtributo(doc, "infNFe", "Id");
                if (chave != null && chave.startsWith("NFe")) chave = chave.substring(3);
            }

            String numero = getText(doc, "nNF");
            String serie  = getText(doc, "serie");

            String emitenteNome = getText(doc, "xNome");  // first xNome is emitente
            String emitenteCnpj = getPrimeiro(doc, "CNPJ");

            // destinatario comes second in the document
            String destinatarioNome = getSegundo(doc, "xNome");
            String destinatarioCnpj = getSegundo(doc, "CNPJ");

            String vNF      = getText(doc, "vNF");
            String pesoBruto = getText(doc, "pesoB");
            String pesoLiquido = getText(doc, "pesoL");
            String qVol      = getText(doc, "qVol");

            return Optional.of(new DadosNFe(
                    chave, numero, serie,
                    emitenteNome, emitenteCnpj,
                    destinatarioNome, destinatarioCnpj,
                    parseBigDecimal(vNF),
                    parseBigDecimal(pesoBruto),
                    parseBigDecimal(pesoLiquido),
                    parseInteger(qVol),
                    "NFE"
            ));
        } catch (Exception e) {
            log.warn("Erro ao parsear NF-e: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<DadosNFe> parsearCTe(Document doc) {
        try {
            String chave = extrairChave(doc, "chCTe");
            if (chave == null) {
                chave = extrairAtributo(doc, "infCte", "Id");
                if (chave != null && chave.startsWith("CTe")) chave = chave.substring(3);
            }

            String numero = getText(doc, "nCT");
            String serie  = getText(doc, "serie");
            String emitente = getText(doc, "xNome");
            String emitenteCnpj = getPrimeiro(doc, "CNPJ");
            String vTPrest = getText(doc, "vTPrest");

            return Optional.of(new DadosNFe(
                    chave, numero, serie,
                    emitente, emitenteCnpj,
                    null, null,
                    parseBigDecimal(vTPrest),
                    null, null, null, "CTE"
            ));
        } catch (Exception e) {
            log.warn("Erro ao parsear CT-e: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String getText(Document doc, String tagName) {
        NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
        if (nodes.getLength() == 0) nodes = doc.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) return nodes.item(0).getTextContent().trim();
        return null;
    }

    private String getPrimeiro(Document doc, String tagName) {
        NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
        if (nodes.getLength() == 0) nodes = doc.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) return nodes.item(0).getTextContent().trim();
        return null;
    }

    private String getSegundo(Document doc, String tagName) {
        NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
        if (nodes.getLength() == 0) nodes = doc.getElementsByTagName(tagName);
        if (nodes.getLength() > 1) return nodes.item(1).getTextContent().trim();
        return null;
    }

    private String extrairChave(Document doc, String tagName) {
        NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
        if (nodes.getLength() == 0) nodes = doc.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) {
            String val = nodes.item(0).getTextContent().trim();
            return val.isEmpty() ? null : val;
        }
        return null;
    }

    private String extrairAtributo(Document doc, String tagName, String atributo) {
        NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
        if (nodes.getLength() == 0) nodes = doc.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) {
            return nodes.item(0).getAttributes().getNamedItem(atributo).getNodeValue();
        }
        return null;
    }

    private BigDecimal parseBigDecimal(String value) {
        if (value == null || value.isBlank()) return null;
        try { return new BigDecimal(value); }
        catch (NumberFormatException e) { return null; }
    }

    private Integer parseInteger(String value) {
        if (value == null || value.isBlank()) return null;
        try { return Integer.parseInt(value.trim()); }
        catch (NumberFormatException e) { return null; }
    }
}
