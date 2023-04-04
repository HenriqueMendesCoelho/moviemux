export type InputValidateRefType = {
  hasError: boolean;
  validate: () => Promise<boolean>;
  resetValidation: () => void;
};

export type InputTextRefType = {
  hasErrors: () => Promise<boolean>;
  resetValidation: () => void;
};
