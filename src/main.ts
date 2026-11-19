import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { AppModule } from './app.module';
if (existsSync('.env')) loadEnvFile('.env');
async function main() {
 const app = await NestFactory.create<NestExpressApplication>(AppModule);
 app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
 app.useStaticAssets(resolve('public')); app.enableShutdownHooks();
 const port = Number(process.env.PORT || 3010); await app.listen(port, '0.0.0.0');
 console.log(`Client: http://localhost:${port}/client.html`);
}
void main();
