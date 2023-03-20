FROM public.ecr.aws/c6v0u1o0/template_node12_jamar_k8s:latest


RUN apt update -y

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY ./* ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 8000

CMD [ "node", "/home/node/app/index.js" ]
