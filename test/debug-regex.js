const pattern = '^[A-Z]\\d{1}\\d{8}$';
const regex = new RegExp(pattern);
const value = '123';
const isValid = regex.test(value);

console.log(`Pattern: ${pattern}`);
console.log(`Regex: ${regex}`);
console.log(`Value: ${value}`);
console.log(`Valid: ${isValid}`);

const value2 = 'A123456789';
console.log(`Value2: ${value2}`);
console.log(`Valid2: ${regex.test(value2)}`);
