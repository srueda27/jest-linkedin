/* eslint-disable */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../index');
const User = require('../database/models/users');
const mongoose = require('../database/dbConection');

const UserService = require('../database/services/users')
const RecipeService = require('../database/services/recipes')

describe('test the recipes API', () => {
  let id;
  let token;
  beforeAll(async () => {
    // create a test user
    const password = bcrypt.hashSync('okay', 10);
    await User.create({
      username: 'admin',
      password,
    });
  });
  afterAll(async () => {
    await User.deleteMany();
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });
  // test login
  describe('POST/login', () => {
    it('authenticate user and sign him in', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const user = {
        username: 'admin',
        password: 'okay',
      };
      const res = await request(app)
        .post('/login')
        .send(user);
      token = res.body.accessToken;
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          accessToken: res.body.accessToken,
          success: true,
          data: expect.objectContaining({
            id: res.body.data.id,
            username: res.body.data.username,
          }),
        }),
      );
    });
    it('do not sign him in, password can not be empty', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const user = {
        username: 'admin',
      };
      const res = await request(app)
        .post('/login')
        .send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'username or password can not be empty'
        }),
      );
    });
    it('do not sign him in, username can not be empty', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const user = {
        password: 'okay',
      };
      const res = await request(app)
        .post('/login')
        .send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'username or password can not be empty'
        }),
      );
    });
    it('do not sign him in, username does not exists', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const user = {
        username: 'chii',
        password: 'okay',
      };
      const res = await request(app)
        .post('/login')
        .send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Incorrect username or password'
        }),
      );
    });
    it('do not sign him in, not a valid password', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const user = {
        username: 'admin',
        password: 'okay2',
      };
      const res = await request(app)
        .post('/login')
        .send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Incorrect username or password'
        }),
      );
    });
    it('do not sign him in, internal server error', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const user = {
        username: 'admin',
        password: 'okay',
      };
      jest.spyOn(UserService, 'findByUsername')
        .mockRejectedValueOnce(new Error());
      const res = await request(app)
        .post('/login')
        .send(user);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'login failed.'
        }),
      );
    });
  });
  // Test Create recipes
  describe('POST/recipes', () => {
    it('it should save new recipe to db', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const recipes = {
        name: "chicken nuggets",
        // difficulty: 2,
        vegetarian: true
      }
      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
      id = res.body.data._id;
    });
    it('it should not save new recipe to db, invalid vegetarian value', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const recipes = {
        name: "chicken nuggets",
        difficulty: 3,
        vegetarian: 'true'
      }
      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'vegetarian field should be boolean'
        })
      );
    });
    it('it should not save new recipe to db, empty name field', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const recipes = {
        difficulty: 3,
        vegetarian: true
      }
      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'name field can not be empty'
        })
      );
    });
    it('it should not save new recipe to db, invalid difficulty field', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const recipes = {
        name: 'jollof rice',
        difficulty: '3',
        vegetarian: true
      }
      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'difficulty field should be a number'
        })
      );
    });
    it('it should not save new recipe to db, invalid token', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const recipes = {
        name: 'jollof rice',
        difficulty: 3,
        vegetarian: true
      }
      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer token`);
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized'
        })
      );
    });
    it('it should not save new recipe to db, internal server error', async () => {
      // DATA YOU WANT TO SAVE TO DB
      const recipes = {
        name: "chicken nuggets",
        difficulty: 2,
        vegetarian: true
      }
      jest.spyOn(RecipeService, 'saveRecipes')
        .mockRejectedValueOnce(new Error())
      const res = await request(app)
        .post('/recipes')
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Failed to save recipes!'
        })
      );
    });
  });
  // Test get all recipes
  describe('GET/recipes', () => {
    it('it should retrieve all the recipes in db', async () => {
      const res = await request(app)
        .get('/recipes');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
    it('it should not retrieve all the recipes in db, internal server error', async () => {
      jest.spyOn(RecipeService, 'allRecipes')
        .mockRejectedValueOnce(new Error())
      const res = await request(app)
        .get('/recipes');
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Some error occurred while retrieving recipes.',
        }),
      );
    });
  });
  // Test get a particular recipe
  describe('GET/recipes/:id', () => {
    it('Retrieve a specified recipe in db', async () => {
      const res = await request(app)
        .get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
    it('it should not retrieve a specified recipe from the db, invalid id passed', async () => {
      const res = await request(app)
        .get(`/recipes/sdf512`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Recipe with id sdf512 does not exist',
        }),
      );
    });
    it('it should not retrieve a specified recipe in db, internal server error', async () => {
      jest.spyOn(RecipeService, 'fetchById')
        .mockRejectedValueOnce(new Error())
      const res = await request(app)
        .get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Some error occurred while retrieving recipe details.',
        }),
      );
    });
  });
  // Test update recipe
  describe('PATCH/recipes/:id', () => {
    it('update the recipe record in db', async () => {
      const recipe = {
        name: 'chicken nugget'
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
    it('it should not update the recipe record in db, invalid difficilty value', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: '3'
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'difficulty field should be a number',
        }),
      );
    });
    it('it should not update the recipe record in db, invalid vegetarian value', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: 3,
        vegetarian: 'true'
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'vegetarian field should be boolean',
        }),
      );
    });
    it('it should not update the recipe record in db, invalid id passed', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: 3,
        vegetarian: true
      };
      const res = await request(app)
        .patch(`/recipes/1512316`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Recipe with id 1512316 does not exist',
        }),
      );
    });
    it('it should not update the recipe record in db, invalid token', async () => {
      const recipe = {
        name: 'chicken nuggets',
        difficulty: 3,
        vegetarian: true
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer sdf5sd4`);
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });
    it('it should not update the recipe record in db, no update passed', async () => {
      const recipe = {};
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'field should not be empty',
        }),
      );
    });
    it('it should not update the recipe record in db, internal server error', async () => {
      const recipe = {
        name: 'chicken nugget'
      };
      jest.spyOn(RecipeService, 'fetchByIdAndUpdate')
        .mockRejectedValueOnce(new Error())
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'An error occured while updating recipe',
        }),
      );
    });
  });
  // Test delete recipes
  describe('DELETE/recipes/:id', () => {
    it('delete the specified recipe in db', async () => {
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Recipe successfully deleted',
        }),
      );
    });
    it('fail to delete the specified recipe in db, invalid token', async () => {
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set('Authorization', `Bearer 2341dgfsdf`);
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });
    it('delete the specified recipe in db', async () => {
      jest.spyOn(RecipeService, 'fetchByIdAndDelete')
        .mockRejectedValueOnce(new Error())
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'An error occured while deleting recipe',
        }),
      );
    });
  });
});
