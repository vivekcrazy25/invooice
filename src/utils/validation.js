export const isEmail   = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPhone   = (v) => /^\d{10,15}$/.test((v||'').replace(/[\s\-+()]/g,''));
export const isRequired = (v) => v !== null && v !== undefined && String(v).trim() !== '';
export const isPositive = (v) => !isNaN(v) && Number(v) > 0;
export const isNonNeg   = (v) => !isNaN(v) && Number(v) >= 0;
export const minLen     = (v, n) => String(v||'').length >= n;
export const maxLen     = (v, n) => String(v||'').length <= n;

export const validateForm = (values, rules) => {
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const v = values[field];
    if (rule.required && !isRequired(v))        { errors[field] = `${rule.label||field} is required`; continue; }
    if (!isRequired(v)) continue;               // skip further checks if empty + not required
    if (rule.email    && !isEmail(v))            { errors[field] = 'Invalid email address'; continue; }
    if (rule.phone    && !isPhone(v))            { errors[field] = 'Phone must be 10–15 digits'; continue; }
    if (rule.min      && !minLen(v, rule.min))   { errors[field] = `Min ${rule.min} characters`; continue; }
    if (rule.max      && !maxLen(v, rule.max))   { errors[field] = `Max ${rule.max} characters`; continue; }
    if (rule.positive && !isPositive(v))         { errors[field] = 'Must be a positive number'; continue; }
    if (rule.nonNeg   && !isNonNeg(v))           { errors[field] = 'Must be 0 or greater'; continue; }
  }
  return { isValid: Object.keys(errors).length === 0, errors };
};
