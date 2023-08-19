export type InputValidateRefType = {
  hasError: boolean;
  validate: () => boolean;
  resetValidation: () => void;
};

export type InputTextRefType = {
  hasErrors: () => Promise<boolean>;
  resetValidation: () => void;
};
