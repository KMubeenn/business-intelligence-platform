export class RegisterDto {
  email!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  organizationName?: string;
  inviteToken?: string;
}

export class LoginDto {
  email!: string;
  password!: string;
}
