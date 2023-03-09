export type tokenPayload = {
  sub: string;
  exp: number;
  aud: string;
  name: string;
  roles: Array<string>;
};
