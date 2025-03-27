module.exports = {
    apps: [
      {
        name: "crm-backend",
        script: "src/app.ts",  // Change to TypeScript source file
        interpreter: "ts-node", // Use ts-node to run TypeScript
        env: {
          NODE_ENV: "production"
        }
      }
    ]
  };
