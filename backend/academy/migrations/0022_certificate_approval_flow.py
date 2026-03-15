from django.conf import settings
from django.db import migrations, models
from django.db.models import F
import django.db.models.deletion


def approve_existing_certificates(apps, schema_editor):
    Certificate = apps.get_model('academy', 'Certificate')
    Certificate.objects.all().update(
        approval_status='APPROVED',
        approved_at=F('issue_date'),
    )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('academy', '0021_course_delivery_mode_is_free'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='approval_status',
            field=models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING', max_length=20),
        ),
        migrations.AddField(
            model_name='certificate',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='certificate',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_certificates', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(approve_existing_certificates, migrations.RunPython.noop),
    ]
