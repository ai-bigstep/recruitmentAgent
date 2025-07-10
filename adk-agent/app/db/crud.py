from sqlalchemy import select, update, or_, and_, text, func
from app.db.models import session, resume_files, jobs, applications
from sqlalchemy import update, or_, cast, String
from sqlalchemy.dialects.postgresql import JSONB



def get_resume_file(file_id):
    result = session.execute(select(resume_files).where(resume_files.c.id == file_id)).fetchone()
    return dict(result._mapping) if result else None

def get_job_data(job_id):
    result = session.execute(select(jobs).where(jobs.c.id == job_id)).fetchone()
    return dict(result._mapping) if result else None



def update_application(application_id, data):
    stmt = update(applications).where(applications.c.id == application_id).values(
        name=data.get("name"), email=data.get("email"),
        phone=data.get("phone"), ats_score=data.get("ats_score"),
    )
    session.execute(stmt)
    session.commit()
    
    
def update_application_status(application_id, status):
    stmt = update(applications).where(applications.c.id == application_id).values(status=status)
    session.execute(stmt)
    session.commit()

def get_pending_applications_by_job_id(job_id):
    results = session.execute(
        select(applications).where(
            (applications.c.job_id == job_id) & (applications.c.status == 'pending')
        )
    ).fetchall()
    return [dict(row._mapping) for row in results]

def get_application_data(application_id):
    result = session.execute(select(applications).where(applications.c.id == application_id)).fetchone()
    return dict(result._mapping) if result else None


def update_calling_status(application_id, call_status):
    stmt = update(applications).where(applications.c.id == application_id).values(call_status=call_status)
    session.execute(stmt)
    session.commit()


def get_application_by_phone(phone):
    result = session.execute(select(applications).where(applications.c.phone == phone)).fetchone()
    return dict(result._mapping) if result else None


# def update_application_call_status_by_phone(phone, call_status):
#     stmt = update(applications).where(applications.c.phone.like(f"%{phone}%")).values(call_status=call_status)
#     session.execute(stmt)
#     session.commit()



def update_application_call_status_by_phone(phone, call_status):
    col = applications.c.phone

    # Build two predicates: one for string columns, one for JSONB columns
    string_pred = col.like(f"%{phone}%")
    json_pred = None

    # If this is a JSONB column, we can match either:
    # 1) a top‑level key "phone" whose value equals the string
    # 2) any array element equals the string
    if isinstance(col.type, JSONB):
        # .astext lets us compare the JSON value as text
        # col['phone'] handles {"phone": "..."}   (you may need to change the key)
        # col.contains([phone]) handles ["123","456"] or {…}
        json_pred = or_(
            col['phone'].astext == phone,
            col.contains([phone])
        )

    # Combine predicates
    if json_pred is not None:
        where_clause = or_(string_pred, json_pred)
    else:
        where_clause = string_pred

    # Execute the update
    stmt = (
        update(applications)
        .where(where_clause)
        .values(call_status=call_status)
    )
    session.execute(stmt)
    session.commit()
