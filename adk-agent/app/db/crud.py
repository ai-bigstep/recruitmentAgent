from sqlalchemy import select, update
from app.db.models import session, resume_files, jobs, applications


def get_resume_file(file_id):
    result = session.execute(select(resume_files).where(resume_files.c.id == file_id)).fetchone()
    return dict(result._mapping) if result else None

def get_job_data(job_id):
    result = session.execute(select(jobs).where(jobs.c.id == job_id)).fetchone()
    return dict(result._mapping) if result else None

def update_application(application_id, data):
    stmt = update(applications).where(applications.c.id == application_id).values(
        name=data.get("name"), email=data.get("email"),
        phone=data.get("phone"), ats_score=data.get("ats_score")
    )
    session.execute(stmt)
    session.commit()