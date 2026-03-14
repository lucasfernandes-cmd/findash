FROM node:20-alpine

WORKDIR /app

# Copy all app files
COPY index.html style.css app.js server.js sw.js ./
COPY pdf.worker.min.js manifest.json privacidade.html ./
COPY icons/ ./icons/
COPY .well-known/ ./.well-known/

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
