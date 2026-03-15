from django.db import migrations, models
import django.db.models.deletion
import academy.models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0018_certificationexam_confirmed_end_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='CertificateTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('orientation', models.CharField(choices=[('landscape', 'Landscape'), ('portrait', 'Portrait')], default='landscape', max_length=20)),
                ('page_width', models.PositiveIntegerField(default=1600)),
                ('page_height', models.PositiveIntegerField(default=1200)),
                ('background_image', models.ImageField(blank=True, null=True, upload_to='certificate_templates/backgrounds/')),
                ('signature_image', models.ImageField(blank=True, null=True, upload_to='certificate_templates/signatures/')),
                ('signer_name', models.CharField(blank=True, max_length=120, null=True)),
                ('signer_title', models.CharField(blank=True, max_length=120, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('layout_config', models.JSONField(blank=True, default=academy.models.default_certificate_layout)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='certificate_templates', to='academy.course')),
            ],
            options={
                'ordering': ['-updated_at', '-id'],
            },
        ),
    ]
