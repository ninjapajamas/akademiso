from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0051_userprofile_notification_preferences'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='certificate_custom_requirements',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='course',
            name='certificate_min_progress',
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text='Persentase minimal penyelesaian materi untuk penerbitan sertifikat.',
            ),
        ),
        migrations.AddField(
            model_name='course',
            name='certificate_require_all_quizzes_passed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='course',
            name='certificate_require_attendance',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='course',
            name='certificate_require_profile_complete',
            field=models.BooleanField(default=False),
        ),
    ]
