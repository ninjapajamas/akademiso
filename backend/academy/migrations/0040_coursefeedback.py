from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0039_studentaccesslink_studentaccesslinkclaim'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CourseFeedback',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criticism', models.TextField(blank=True, default='')),
                ('suggestion', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedback_entries', to='academy.course')),
                ('lesson', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_entries', to='academy.lesson')),
                ('quiz_attempt', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedback_entries', to='academy.userquizattempt')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='course_feedback_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-updated_at', '-id'],
            },
        ),
        migrations.AddConstraint(
            model_name='coursefeedback',
            constraint=models.UniqueConstraint(fields=('course', 'user'), name='unique_course_feedback_per_user'),
        ),
    ]
