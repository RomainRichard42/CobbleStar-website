import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

test('MySQL game-state tables: migration replay, linked identity joins and ownership tracking',{skip:!process.env.LINK_TEST_MYSQL_PORT},async()=>{
  // Dedicated disposable database on the existing CI-only MySQL service, never production.
  const database='cs_discord_test_'+randomBytes(6).toString('hex');
  const admin=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.LINK_TEST_MYSQL_PORT),user:'root',password:'cobblestar-test-root-only'});
  let conn;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    conn=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.LINK_TEST_MYSQL_PORT),user:'root',password:'cobblestar-test-root-only',database});
    const migration=await readFile(new URL('../migrations/015_discord_game_sync.sql',import.meta.url),'utf8');
    for(let replay=0;replay<2;replay++)for(const sql of migration.split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean))await conn.query(sql);
    await conn.query('CREATE TABLE users (discord_id VARCHAR(32) UNIQUE, minecraft_uuid CHAR(32) UNIQUE, merged_into CHAR(36), minecraft_linked_at DATETIME)');
    const gid='123456789012345670',did='123456789012345671',uuid='a'.repeat(32);
    await conn.execute('INSERT INTO users VALUES(?,?,NULL,NOW())',[did,uuid]);
    await conn.execute('INSERT INTO discord_role_state (guild_id,discord_id,roles,uuid) VALUES(?,?,?,?)',[gid,did,'["123456789012345672"]',uuid]);
    const insert=`INSERT INTO discord_game_players(guild_id,server_id,uuid,profile) SELECT ?,?,?,? FROM users WHERE minecraft_uuid=? AND discord_id IS NOT NULL AND merged_into IS NULL AND minecraft_linked_at IS NOT NULL ON DUPLICATE KEY UPDATE profile=VALUES(profile),updated_at=NOW()`;
    await conn.execute(insert,[gid,'main',uuid,JSON.stringify({uuid,grade:'elite',ranked:'star',club:null,premium:'galactique'}),uuid]);
    await conn.execute(insert,[gid,'main','b'.repeat(32),'{}','b'.repeat(32)]);
    const [rows]=await conn.query(`SELECT u.discord_id,p.profile,r.uuid AS owner_uuid FROM users u JOIN discord_game_players p ON p.uuid=u.minecraft_uuid AND p.guild_id=? AND p.server_id=? LEFT JOIN discord_role_state r ON r.discord_id=u.discord_id AND r.guild_id=? WHERE u.merged_into IS NULL`,[gid,'main',gid]);
    assert.equal(rows.length,1);assert.equal(rows[0].owner_uuid,uuid);
    assert.equal((typeof rows[0].profile==='string'?JSON.parse(rows[0].profile):rows[0].profile).ranked,'star');
    assert.equal((typeof rows[0].profile==='string'?JSON.parse(rows[0].profile):rows[0].profile).premium,'galactique');
    await conn.query('UPDATE users SET discord_id=NULL,minecraft_uuid=NULL,minecraft_linked_at=NULL');
    const [unlinked]=await conn.query('SELECT r.discord_id,u.minecraft_uuid FROM discord_role_state r LEFT JOIN users u ON u.discord_id=r.discord_id WHERE r.guild_id=?',[gid]);
    assert.equal(unlinked.length,1);assert.equal(unlinked[0].minecraft_uuid,null);
  }finally{if(conn)await conn.end();await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);await admin.end();}
});
