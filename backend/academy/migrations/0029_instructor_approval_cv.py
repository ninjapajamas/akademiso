from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0028_userprofile_staff_role'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='instructor',
            name='approval_status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Menunggu Approval'),
                    ('APPROVED', 'Disetujui'),
                    ('REJECTED', 'Ditolak'),
                ],
                default='APPROVED',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='instructor',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='instructor',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_instructors',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='instructor',
            name='cv',
            field=models.FileField(blank=True, null=True, upload_to='instructor_cvs/'),
        ),
        migrations.AddField(
            model_name='instructor',
            name='rejection_reason',
            field=models.TextField(blank=True, null=True),
        ),
    ]
