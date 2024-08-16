FROM node:22-alpine3.19 as base 
WORKDIR /app

# Corrected 'pacakges.json' to 'package.json'
COPY package.json .

RUN npm install

COPY . .  

EXPOSE 3000

CMD ["npm", "start"]
