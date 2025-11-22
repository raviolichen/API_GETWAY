const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./database.sqlite');

// 读取迁移文件
const migrationFile = process.argv[2] || 'migrations/002_add_alerts.sql';
const sql = fs.readFileSync(migrationFile, 'utf-8');

console.log(`执行迁移文件: ${migrationFile}`);

// 直接执行整个 SQL 文件（SQLite 支持多语句执行）
db.exec(sql, (err) => {
    if (err) {
        console.error('迁移执行失败:', err.message);
    } else {
        console.log('✓ 迁移执行成功');
    }

    db.close((closeErr) => {
        if (closeErr) {
            console.error('关闭数据库失败:', closeErr.message);
        } else {
            console.log('\n迁移完成！');
        }
    });
});
