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

    // 基础数学运算辅助函数
    Handlebars.registerHelper('add', function (a, b) {
        return parseFloat(a) + parseFloat(b);
    });

    Handlebars.registerHelper('subtract', function (a, b) {
        return parseFloat(a) - parseFloat(b);
    });

    Handlebars.registerHelper('multiply', function (a, b) {
        return parseFloat(a) * parseFloat(b);
    });

    Handlebars.registerHelper('divide', function (a, b) {
        const divisor = parseFloat(b);
        return divisor === 0 ? null : parseFloat(a) / divisor;
    });

    // 字符串处理
    Handlebars.registerHelper('concat', function (...args) {
        // 最后一个参数是 Handlebars options，需要移除
        const values = args.slice(0, -1);
        return values.join('');
    });

    Handlebars.registerHelper('trim', function (str) {
        return String(str || '').trim();
    });

    Handlebars.registerHelper('replace', function (str, search, replacement) {
        return String(str || '').replace(new RegExp(search, 'g'), replacement);
    });

    Handlebars.registerHelper('substring', function (str, start, end) {
        return String(str || '').substring(start, end);
    });

    // 条件判断
    Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
    });

    Handlebars.registerHelper('ne', function (a, b) {
        return a !== b;
    });

    Handlebars.registerHelper('gt', function (a, b) {
        return a > b;
    });

    Handlebars.registerHelper('gte', function (a, b) {
        return a >= b;
    });

    Handlebars.registerHelper('lt', function (a, b) {
        return a < b;
    });

    Handlebars.registerHelper('lte', function (a, b) {
        return a <= b;
    });

    // 日期处理
    Handlebars.registerHelper('formatDate', function (value, format) {
        if (!value) return '';

        // 支持 YYYYMMDD 格式
        let date;
        if (typeof value === 'string' && /^\d{8}$/.test(value)) {
            const year = value.substring(0, 4);
            const month = value.substring(4, 6);
            const day = value.substring(6, 8);
            date = new Date(`${year}-${month}-${day}`);
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) return value;

        // 简单的格式化
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        } else if (format === 'YYYY/MM/DD') {
            return `${year}/${month}/${day}`;
        } else if (format === 'YYYYMMDD') {
            return `${year}${month}${day}`;
        }
        return date.toISOString().split('T')[0];
    });

    Handlebars.registerHelper('now', function (format) {
        const date = new Date();
        if (!format) return date.toISOString();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        } else if (format === 'YYYYMMDD') {
            return `${year}${month}${day}`;
        }
        return date.toISOString();
    });

    registered = true;
}

module.exports = {
    registerDefaultHelpers
};
