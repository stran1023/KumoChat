//in backend folder run these commands

npm init -y
npm install express prisma @prisma/client jsonwebtoken bcrypt cors dotenv
npm install --save-dev nodemon

//Sau khi tạo DB

npx prisma format
npx prisma migrate dev --name init
npx prisma generate
npx prisma studio

//Run server
npx nodemon src/server.js


