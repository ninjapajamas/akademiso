from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0027_alter_certificatetemplate_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='staff_role',
            field=models.CharField(
                blank=True,
                choices=[('admin', 'Admin'), ('akuntan', 'Akuntan')],
                max_length=20,
                null=True,
            ),
        ),
    ]
