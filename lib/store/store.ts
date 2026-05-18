"use client";

import { configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import { kycReducer } from "@/lib/store/kyc-slice";
import { kycPersistTransform } from "@/lib/store/persist-transform";

const kycPersistConfig = {
  key: "max-life-kyc-v2",
  storage,
  transforms: [kycPersistTransform],
};

const persistedKycReducer = persistReducer(kycPersistConfig, kycReducer);

export const store = configureStore({
  reducer: {
    kyc: persistedKycReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
