import express, { Request, Response } from "express";

import {
  getUserByEmail,
  createUser,
  getUserByUsername,
  UserModel,
} from "../db/users";
import { random, authentication } from "../helpers";

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    //console.log('username is', username, 'password is', password)
    if (!username || !password) {
      return res.status(400).json({ message: "Incomplete Input" });
    }

    const user = await UserModel.findOne({ username: username }).select(
      "+authentication.salt +authentication.password"
    );
    if (!user) {
      return res.status(400).json({ message: "User not Found" });
    }

    const expectedHash = user.authentication
      ? authentication(user.authentication.salt, password)
      : null;

    if (user.authentication.password != expectedHash) {
      return res.status(403).json({ message: "Invalid Password" });
    }

    const salt = random();
    user.authentication.sessionToken = authentication(
      salt,
      user._id.toString()
    );
    await user.save();

    res.cookie("Auth", user.authentication.sessionToken, {
      domain: "localhost",
      path: "/",
    });

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, username } = req.body;
    //console.log(email, password, username)
    if (!email || !password || !username) {
      return res.sendStatus(400);
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.sendStatus(400);
    }

    const salt = random();
    const user = await createUser({
      email,
      username,
      authentication: {
        salt,
        password: authentication(salt, password),
      },
    });

    return res.status(200).json(user).end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(400);
  }
};
