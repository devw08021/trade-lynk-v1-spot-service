import isEmpty from "../lib/isEmpty";

class DateValidator {
  validateDate() {
    return async (c, next) => {
      const reqQuery = c.req.query();
      const errors = {};

      if (reqQuery.type === "searchType") {
        let parseData;

        try {
          parseData = JSON.parse(reqQuery.fillter || "{}");
        } catch (e) {
          return c.json(
            {
              success: false,
              errors: { fillter: "Invalid JSON in 'fillter'" },
            },
            400
          );
        }

        const key = Object.keys(parseData)[0];
        const dateField =
          key === "sefd_orderDate" ? "sefd_orderDate" : "sefd_createdAt";
        const { startDate: rawStartDate, endDate: rawEndDate } =
          parseData[dateField] || {};

        const startDate = rawStartDate ? new Date(rawStartDate) : null;
        const endDate = rawEndDate ? new Date(rawEndDate) : null;
        const currentDate = new Date();

        if (isEmpty(rawStartDate)) {
          errors.date = "Choose start date";
        } else if (startDate && startDate.getTime() > currentDate.getTime()) {
          errors.date = "Invalid start date";
        } else if (isEmpty(rawEndDate)) {
          errors.date = "Choose end date";
        } else if (endDate && endDate.getTime() > currentDate.getTime()) {
          errors.date = "Invalid end date";
        } else if (
          startDate &&
          endDate &&
          startDate.getTime() > endDate.getTime()
        ) {
          errors.date = "Invalid date";
        }
      }

      if (!isEmpty(errors)) {
        return c.json({ success: false, errors }, 400);
      }

      await next();
    };
  }
}

export const dateValidator = new DateValidator();
export default dateValidator;

export const validateDate = dateValidator.validateDate.bind(dateValidator);
