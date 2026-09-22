export type Usuario = {
  id: number;
  email: string;
  nombre_completo: string;
  rol: string;
  estado: boolean;
};

export type LoginGoogleResponse = {
  token: string;
  usuario: Usuario;
};
