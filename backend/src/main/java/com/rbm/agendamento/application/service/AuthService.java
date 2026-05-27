package com.rbm.agendamento.application.service;

import com.rbm.agendamento.api.exception.BusinessException;
import com.rbm.agendamento.application.dto.auth.LoginRequest;
import com.rbm.agendamento.application.dto.auth.LoginResponse;
import com.rbm.agendamento.application.dto.auth.RefreshTokenRequest;
import com.rbm.agendamento.config.AppProperties;
import com.rbm.agendamento.config.security.JwtService;
import com.rbm.agendamento.domain.entity.RefreshToken;
import com.rbm.agendamento.domain.entity.Usuario;
import com.rbm.agendamento.infrastructure.repository.RefreshTokenRepository;
import com.rbm.agendamento.infrastructure.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AppProperties appProperties;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.senha()));

        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "Usuário não encontrado"));

        refreshTokenRepository.revogarTodosPorUsuario(usuario);

        String token = jwtService.gerarToken(usuario);
        String refreshToken = criarRefreshToken(usuario);

        return new LoginResponse(token, refreshToken,
                new LoginResponse.UsuarioInfo(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getRole()));
    }

    @Transactional
    public LoginResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new BusinessException("INVALID_REFRESH_TOKEN", "Refresh token inválido"));

        if (Boolean.TRUE.equals(refreshToken.getRevogado()) || refreshToken.isExpirado()) {
            throw new BusinessException("EXPIRED_REFRESH_TOKEN", "Refresh token expirado ou revogado");
        }

        refreshToken.setRevogado(true);
        refreshTokenRepository.save(refreshToken);

        Usuario usuario = refreshToken.getUsuario();
        String novoToken = jwtService.gerarToken(usuario);
        String novoRefreshToken = criarRefreshToken(usuario);

        return new LoginResponse(novoToken, novoRefreshToken,
                new LoginResponse.UsuarioInfo(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getRole()));
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.findByToken(refreshTokenStr)
                .ifPresent(rt -> {
                    rt.setRevogado(true);
                    refreshTokenRepository.save(rt);
                });
    }

    private String criarRefreshToken(Usuario usuario) {
        long refreshMs = appProperties.security().jwt().refreshExpirationMs();
        RefreshToken refreshToken = RefreshToken.builder()
                .usuario(usuario)
                .token(UUID.randomUUID().toString())
                .expiraEm(LocalDateTime.now().plusNanos(refreshMs * 1_000_000L))
                .revogado(false)
                .build();
        return refreshTokenRepository.save(refreshToken).getToken();
    }
}
