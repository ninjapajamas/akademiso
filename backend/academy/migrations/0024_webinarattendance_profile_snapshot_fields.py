from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0023_webinarattendance_and_nullable_certificate_exam'),
    ]

    operations = [
        migrations.AddField(
            model_name='webinarattendance',
            name='attendee_company',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='webinarattendance',
            name='attendee_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='webinarattendance',
            name='attendee_name',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='webinarattendance',
            name='attendee_phone',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='webinarattendance',
            name='attendee_position',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
