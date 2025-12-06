export class CreateUserDto {
  name?: string;
  email: string;
  passwordHash: string;
  roleId?: string;
}

export class UpdateUserDto {
  name?: string;
  email?: string;
  role?: Role;
  refreshTokenHash?: string;
  passwordHash?: string;
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class UserDbDto {
  id: number;
  email: string;
  name?: string;
  passwordHash?: string;
  roleId?: string;
  role?: Role;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
