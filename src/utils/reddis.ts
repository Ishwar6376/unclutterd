// /lib/redis.ts
import Redis from "ioredis";
const REDIS_HOST=process.env.REDIS_HOST;
const REDIS_PORT=process.env.REDIS_PORT? parseInt(process.env.REDIS_PORT):19990;
const REDIS_PASSWORD=process.env.REDIS_PASSWORD;

const redis=new Redis({
    host:REDIS_HOST,
    port:REDIS_PORT,
    password:REDIS_PASSWORD,
    tls:REDIS_HOST?.includes("rediss")?{}:undefined,
});
redis.on("connect",()=>{
    console.log("Redis is connected");
});

redis.on("error",(err)=>{
    console.log("Redis connection error",err);
})

export default redis;
