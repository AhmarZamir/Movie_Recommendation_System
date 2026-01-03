# app/routers/recommendations.py
from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
from pathlib import Path

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

DATA_CSV = Path(__file__).resolve().parents[2] / "data" / "movies.csv"

def _load():
    if not DATA_CSV.exists():
        raise HTTPException(status_code=500, detail=f"Missing data file: {DATA_CSV}")
    df = pd.read_csv(DATA_CSV)
    return df

def _vectorize(df: pd.DataFrame) -> np.ndarray:
    texts = (df["genres"].fillna("") + " " + df["overview"].fillna("")).astype(str).str.lower()
    vocab = {}
    rows = []
    for t in texts:
        words = re.findall(r"[a-z0-9]+", t)
        counts = {}
        for w in words:
            if len(w) < 2:
                continue
            counts[w] = counts.get(w, 0) + 1
        rows.append(counts)
        for w in counts:
            if w not in vocab:
                vocab[w] = len(vocab)
    mat = np.zeros((len(rows), len(vocab)), dtype=np.float32)
    for i, counts in enumerate(rows):
        for w, c in counts.items():
            mat[i, vocab[w]] = c
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return mat / norms

import re

@router.get("/top5/{movie_id}")
def top5(movie_id: int):
    df = _load()
    if "movie_id" not in df.columns:
        raise HTTPException(status_code=500, detail="movies.csv missing movie_id column")
    if movie_id not in set(df["movie_id"].astype(int).tolist()):
        raise HTTPException(status_code=404, detail="Movie not found in local dataset")
    vec = _vectorize(df)
    idx = df.index[df["movie_id"].astype(int) == int(movie_id)][0]
    sims = vec @ vec[idx]
    order = np.argsort(-sims)
    rec_idxs = [i for i in order if i != idx][:5]
    rec = df.iloc[rec_idxs].copy()
    rec["similarity"] = sims[rec_idxs]
    return rec.to_dict(orient="records")
