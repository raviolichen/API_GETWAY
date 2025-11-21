const Handlebars = require('handlebars');

let registered = false;

function registerDefaultHelpers() {
    if (registered) return;
    Handlebars.registerHelper('uppercase', function (str = '') {
        return String(str).toUpperCase();
    });

    Handlebars.registerHelper('lowercase', function (str = '') {
        return String(str).toLowerCase();
    });

    Handlebars.registerHelper('json', function (context) {
        return JSON.stringify(context, null, 2);
    });

    Handlebars.registerHelper('dateFormat', function (value, locale = 'en-US', options = {}) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat(locale, Object.keys(options || {}).length ? options : {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    });

    Handlebars.registerHelper('default', function (value, fallback) {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        return value;
    });

    Handlebars.registerHelper('math', function (lvalue, operator, rvalue) {
        const left = parseFloat(lvalue);
        const right = parseFloat(rvalue);
        switch (operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return right === 0 ? null : left / right;
            default: return null;
        }
    });

    registered = true;
}

module.exports = {
    registerDefaultHelpers
};
