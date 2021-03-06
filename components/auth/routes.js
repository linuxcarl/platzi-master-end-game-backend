const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const jwt = require('jsonwebtoken');
const ApiKeysService = require('./apiKeysService');

const { config } = require('../../config');

// Basic strategy
require('../../utils/auth/strategies/basic');

function authApi(app) {
  const router = express.Router();
  app.use('/api/auth', router);

  const apiKeysService = new ApiKeysService();

  router.post('/sign-in', async function (req, res, next) {
    const { apiKeyToken } = req.body;
    if (!apiKeyToken) {
      next(boom.unauthorized('apiKeyToken is required'));
      return;
    }
    passport.authenticate('basic', function (error, user) {
      try {
        if (error || !user) {
          next(boom.unauthorized('Please verify username or password'));
          return;
        }
        req.login(user, { session: false }, async function (error) {
          if (error) {
            next(error);
            return;
          }

          const apiKey = await apiKeysService.getApiKey({ token: apiKeyToken });

          if (!apiKey) {
            next(boom.unauthorized());
            return;
          }

          const {
            _id: id,
            username,
            firstName,
            isActive,
            imageURL,
            lastName,
            typeOfUser,
          } = user;

          const defaultPath = config.defaultPath[user.typeOfUser] || '/';

          const payload = {
            sub: id,
            username,
            scopes: apiKey.scopes,
          };

          const token = jwt.sign(payload, config.authJwtSecret, {
            expiresIn: '5d',
          });

          return res.status(200).json({
            token,
            user: {
              id,
              username,
              typeOfUser,
              isActive,
              imageURL,
              firstName,
              lastName,
              defaultPath,
            },
          });
        });
      } catch (error) {
        next(error);
      }
    })(req, res, next);
  });
}

module.exports = authApi;
