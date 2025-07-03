from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker
import os

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = os.getenv("DB_PORT", "5432") 
DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
print("DB URL:", DB_URL)  # Debugging line to check the DB_URL
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
session = Session()

metadata = MetaData()
resume_files = Table('resume_files', metadata, autoload_with=engine)
jobs = Table('jobs', metadata, autoload_with=engine)
applications = Table('applications', metadata, autoload_with=engine)