alter table public.automation_jobs
  drop constraint if exists automation_jobs_job_type_check;

alter table public.automation_jobs
  add constraint automation_jobs_job_type_check
  check (
    job_type = any (
      array[
        'discovery'::text,
        'generation'::text,
        'notification'::text,
        'publish'::text,
        'newsroom'::text
      ]
    )
  );
