// src/validators/ValidationController.ts

type ValidationInput = {
  field: string;
  type: string;
  value: any;
  matchValue?: any;
};

class ValidationController {
  static regex = {
    onlyString: /^[a-zA-Z\s]+$/,
    onlyNumber: /^[+-]?(\d*\.)?\d+$/,
    onlySymbol: /^[!@#\$%\^\&*\)\(+=._-]+$/,
    onlyEmail: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    onlyPassword: /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{6,18}$/,
    onlyEqual: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/,
    strNum_: /^[a-zA-Z0-9_]+$/,
    strNum_Space: /^[a-zA-Z0-9_ ]+$/,
    objectId: /^[0-9a-fA-F]{24}$/,
    imageFormat: /\.(jpg|jpeg|png)$/i,
    onlyUPI: /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/,
  };

  static passwordChecks = {
    hasCaps: /[A-Z]/,
    hasSmall: /[a-z]/,
    hasNumber: /\d/,
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/,
  };

  static validate(data: ValidationInput[]) {
    const errors: Record<string, string> = {};

    if (!Array.isArray(data)) return { errors };

    data.forEach(row => {
      const { field, type, value, matchValue } = row;

      if (!value && type !== "image") {
        errors[field] = "*Required";
        return;
      }

      switch (type) {
        case "string":
          if (value.length > 50 && field !== "country" && field !== "address") {
            errors[field] = "Not more than 50 characters";
          } else if (!this.regex.onlyString.test(value)) {
            errors[field] = "Invalid";
          }
          break;

        case "number":
          if (!this.regex.onlyNumber.test(value)) {
            errors[field] = "Invalid";
          } else if (parseFloat(value) <= 0) {
            errors[field] = "Allow Only Numeric";
          }
          break;

        case "email":
          if (!this.regex.onlyEmail.test(value)) {
            errors[field] = "Invalid";
          }
          break;

        case "password":
          if (!this.passwordChecks.hasCaps.test(value)) {
            errors[field] = "At least one uppercase";
          } else if (!this.passwordChecks.hasSmall.test(value)) {
            errors[field] = "At least one lowercase";
          } else if (!this.passwordChecks.hasNumber.test(value)) {
            errors[field] = "At least one number";
          } else if (!this.passwordChecks.hasSymbol.test(value)) {
            errors[field] = "At least one special character";
          } else if (value.length < 8) {
            errors[field] = "Not less than 8 characters";
          } else if (value.length > 16) {
            errors[field] = "Not more than 16 characters";
          } else if (!this.regex.onlyPassword.test(value)) {
            errors[field] = "Invalid";
          }
          break;

        case "match":
          if (value !== matchValue) {
            errors[field] = "Passwords do not match";
          }
          break;

        case "notmatch":
          if (value === matchValue) {
            errors[field] = "Must not be equal";
          }
          break;

        case "upi":
          if (!this.regex.onlyUPI.test(value)) {
            errors[field] = "Invalid UPI";
          }
          break;

        case "equal":
          if (!this.regex.onlyEqual.test(value)) {
            errors[field] = "Invalid URL";
          }
          break;

        case "gte":
          if (parseFloat(value) <= matchValue) {
            errors[field] = `Must be greater than ${matchValue}`;
          }
          break;

        case "lte":
          if (parseFloat(value) >= matchValue) {
            errors[field] = `Must be lesser than ${matchValue}`;
          }
          break;

        case "str&Num&_":
        case "strNum_":
          if (!this.regex.strNum_.test(value)) {
            errors[field] = "Invalid";
          }
          break;

        case "strNum_Space":
          if (!this.regex.strNum_Space.test(value)) {
            errors[field] = "Invalid";
          }
          break;

        case "objectId":
          if (!this.regex.objectId.test(value)) {
            errors[field] = "Invalid";
          }
          break;

        case "image":
          if (value?.size > 1000000) {
            errors[field] = "File must be 1MB or less";
          } else if (!this.regex.imageFormat.test(value?.name)) {
            errors[field] = "Invalid file format";
          }
          break;

        case "dob":
          const birthDate = new Date(value);
          const now = new Date();
          const minAgeDate = new Date();
          minAgeDate.setFullYear(now.getFullYear() - 18);
          if (birthDate >= minAgeDate) {
            errors[field] = "Must be 18 years old";
          }
          break;

        case "required":
          if (
            value === "" ||
            value === null ||
            value === undefined ||
            (Array.isArray(value) && value.length === 0)
          ) {
            errors[field] = "Invalid";
          }
          break;

        default:
          break;
      }
    });

    return { errors };
  }
}

export default ValidationController;
