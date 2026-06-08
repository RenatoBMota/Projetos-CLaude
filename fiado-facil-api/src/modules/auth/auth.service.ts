import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from './entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: { email: loginDto.email, ativo: true },
      relations: ['estabelecimento'],
    });

    if (!usuario || !(await usuario.validarSenha(loginDto.senha))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.gerarToken(usuario);
  }

  async register(registerDto: RegisterDto) {
    const existe = await this.usuarioRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existe) throw new ConflictException('E-mail já cadastrado');

    const usuario = this.usuarioRepository.create(registerDto);
    await this.usuarioRepository.save(usuario);
    return this.gerarToken(usuario);
  }

  async perfil(usuarioId: string) {
    return this.usuarioRepository.findOne({
      where: { id: usuarioId },
      relations: ['estabelecimento'],
    });
  }

  private gerarToken(usuario: Usuario) {
    const payload = { sub: usuario.id, email: usuario.email, role: usuario.role };
    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        estabelecimento: usuario.estabelecimento,
      },
    };
  }
}
