export type InputValidateRefType = {
  hasError: boolean;
  validate: () => void;
  resetValidation: () => void;
};

export type InputTextRefType = {
  hasErrors: () => boolean;
  resetValidation: () => void;
};
