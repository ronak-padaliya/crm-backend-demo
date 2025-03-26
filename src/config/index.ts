import * as dotenv from 'dotenv';
dotenv.config();
console.log("NODE_ENV => ",process.env.PORT);
// if (process.env.NODE_ENV === 'development')
//     dotenv.config({ path: '.env' });

export const config = {
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION,
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
}