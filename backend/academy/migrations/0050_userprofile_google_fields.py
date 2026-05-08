from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0049_userprofile_nik'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='google_avatar_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='google_sub',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]
