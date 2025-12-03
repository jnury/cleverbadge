import express from 'express';


// Prevent the server from starting during tests
// This mocks the listen method on the express application prototype
// so that when index.js calls app.listen(), it does nothing.
express.application.listen = function (...args) {
    console.log('🚫 Preventing app.listen() in test environment');
    return {
        close: (cb) => { if (cb) cb(); },
        address: () => ({ port: 3000 })
    };
};
