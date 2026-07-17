from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0050_userprofile_google_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='notify_email_schedule',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_email_certificate',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_email_promo',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_sms',
            field=models.BooleanField(default=False),
        ),
    ]
