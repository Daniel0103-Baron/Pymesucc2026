import { Request, Response } from 'express';
import { Usuario } from '../usuarios/usuario.modelo';
import { Rol } from '../usuarios/rol.modelo';
import { Empresa } from '../empresas/empresa.modelo';
import { EstudianteSemillero } from '../estudiantes/estudiante_semillero.modelo';
import { generarTokens } from '../../utilidades/jwt';
import { compararPassword, encriptarPassword } from '../../utilidades/encriptacion';
import mongoose from 'mongoose';
import { SolicitudAutenticada } from '../../middlewares/verificar_token';

export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
  const { correo, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ correo, estado: true }).populate('id_rol');
    if (!usuario) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const passwordValida = await compararPassword(password, usuario.password_hash);
    if (!passwordValida) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const rol = usuario.id_rol as any;
    if (!rol?.nombre) {
      res.status(409).json({ error: 'La cuenta requiere sincronización de rol. Contacta al administrador.' });
      return;
    }

    const tokens = generarTokens(usuario._id as mongoose.Types.ObjectId, rol.nombre);

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      tokens,
      usuario: {
        id: usuario._id,
        correo: usuario.correo,
        rol: rol.nombre
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const registrarEmpresa = async (req: Request, res: Response): Promise<void> => {
  return registrarEmpresaBase(req, res, 'empresa');
};

export const registrarEmpresaComoConsultor = async (req: SolicitudAutenticada, res: Response): Promise<void> => {
  const origen = req.usuario?.rol === 'universidad' ? 'universidad' : 'consultor';
  return registrarEmpresaBase(req, res, origen, req.usuario?.id);
};

const registrarEmpresaBase = async (
  req: Request,
  res: Response,
  origenRegistro: 'empresa' | 'consultor' | 'universidad',
  idUsuarioRegistro?: string
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      nit, razon_social, sector, tamano, ciudad, 
      ano_constitucion, parque_tecnologico, representante, 
      cargo_entrevistado, telefono, correo, password 
    } = req.body;

    const existeUsuario = await Usuario.findOne({ correo }).session(session);
    if (existeUsuario) {
      await session.abortTransaction();
      res.status(400).json({ error: 'El correo ya está registrado' });
      return;
    }

    const existeEmpresa = await Empresa.findOne({ nit }).session(session);
    if (existeEmpresa) {
      await session.abortTransaction();
      res.status(400).json({ error: 'El NIT ya está registrado' });
      return;
    }

    const rolEmpresa = await Rol.findOne({ nombre: 'empresa' }).session(session);
    if (!rolEmpresa) {
      await session.abortTransaction();
      res.status(500).json({ error: 'Rol de empresa no encontrado en el sistema' });
      return;
    }

    const passwordHash = await encriptarPassword(password);

    const nuevoUsuario = new Usuario({
      id_rol: rolEmpresa._id,
      correo,
      password_hash: passwordHash
    });
    await nuevoUsuario.save({ session });

    const nuevaEmpresa = new Empresa({
      id_usuario: nuevoUsuario._id,
      id_usuario_registro: idUsuarioRegistro,
      origen_registro: origenRegistro,
      nit,
      razon_social,
      sector,
      tamano,
      ciudad,
      ano_constitucion,
      parque_tecnologico,
      representante,
      cargo_entrevistado,
      telefono
    });
    await nuevaEmpresa.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      mensaje: origenRegistro === 'empresa' ? 'Empresa registrada exitosamente' : 'Empresa registrada por consultor exitosamente',
      empresaId: nuevaEmpresa._id,
      usuarioId: nuevoUsuario._id
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error en registro de empresa:', error);
    res.status(500).json({ error: 'Error interno registrando la empresa' });
  }
};

export const registrarSemillero = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { identificacion, nombres, apellidos, programa_academico, correo, password } = req.body;

    const existeUsuario = await Usuario.findOne({ correo }).session(session);
    if (existeUsuario) {
      await session.abortTransaction();
      res.status(400).json({ error: 'El correo ya está registrado' });
      return;
    }

    const existeEstudiante = await EstudianteSemillero.findOne({ identificacion }).session(session);
    if (existeEstudiante) {
      await session.abortTransaction();
      res.status(400).json({ error: 'La identificación ya está registrada' });
      return;
    }

    const rolSemillero = await Rol.findOne({ nombre: 'semillero' }).session(session);
    if (!rolSemillero) {
      await session.abortTransaction();
      res.status(500).json({ error: 'Rol de semillero no encontrado en el sistema' });
      return;
    }

    const passwordHash = await encriptarPassword(password);

    const nuevoUsuario = new Usuario({
      id_rol: rolSemillero._id,
      correo,
      password_hash: passwordHash
    });
    await nuevoUsuario.save({ session });

    const nuevoEstudiante = new EstudianteSemillero({
      id_usuario: nuevoUsuario._id,
      identificacion,
      nombres,
      apellidos,
      programa_academico
    });
    await nuevoEstudiante.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      mensaje: 'Usuario de semillero registrado exitosamente',
      estudianteId: nuevoEstudiante._id,
      usuarioId: nuevoUsuario._id
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error en registro de semillero:', error);
    res.status(500).json({ error: 'Error interno registrando usuario de semillero' });
  }
};
