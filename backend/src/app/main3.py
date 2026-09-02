from backend.database import Base, engine, get_db
from backend.model import itemDB
from backend.schema import itemCreate, itemResponse
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Product API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Product API is running"}


@app.post("/products", response_model=itemResponse)
async def add_product(product: itemCreate, db: Session = Depends(get_db)):
    db_product = itemDB(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.get("/products", response_model=list[itemResponse])
async def get_products(db: Session = Depends(get_db)):
    return db.query(itemDB).all()


@app.get("/products/{pid}", response_model=itemResponse)
async def get_product(pid: int, db: Session = Depends(get_db)):
    db_product = db.query(itemDB).filter(itemDB.id == pid).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product


@app.delete("/products/{pid}")
async def delete_product(pid: int, db: Session = Depends(get_db)):
    db_product = db.query(itemDB).filter(itemDB.id == pid).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(db_product)
    db.commit()
    return {"message": "Successfully deleted."}


@app.put("/products/{pid}", response_model=itemResponse)
async def update_product(pid: int, product_data: itemCreate, db: Session = Depends(get_db)):
    db_product = db.query(itemDB).filter(itemDB.id == pid).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in product_data.model_dump().items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    return db_product