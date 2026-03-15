from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0022_certificate_approval_flow'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='certificate',
            name='exam',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='academy.certificationexam'),
        ),
        migrations.CreateModel(
            name='WebinarAttendance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_present', models.BooleanField(default=False)),
                ('attended_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='webinar_attendances', to='academy.course')),
                ('marked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='marked_webinar_attendances', to=settings.AUTH_USER_MODEL)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='webinar_attendances', to='academy.order')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='webinar_attendances', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-attended_at', '-updated_at'],
                'unique_together': {('user', 'course')},
            },
        ),
    ]
