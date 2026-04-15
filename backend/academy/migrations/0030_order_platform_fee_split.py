from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations, models


PLATFORM_FEE_RATE = Decimal('0.10')
MONEY_QUANTIZER = Decimal('0.01')


def backfill_revenue_split(apps, schema_editor):
    Order = apps.get_model('academy', 'Order')
    orders_to_update = []

    for order in Order.objects.all():
        gross_amount = Decimal(order.total_amount or 0)
        fee_rate = Decimal(order.platform_fee_rate or PLATFORM_FEE_RATE)
        order.platform_fee_amount = (gross_amount * fee_rate).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
        order.instructor_earning_amount = (gross_amount - order.platform_fee_amount).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
        orders_to_update.append(order)

    if orders_to_update:
        Order.objects.bulk_update(
            orders_to_update,
            ['platform_fee_amount', 'instructor_earning_amount'],
        )


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0029_instructor_approval_cv'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='platform_fee_rate',
            field=models.DecimalField(decimal_places=4, default=Decimal('0.10'), max_digits=5),
        ),
        migrations.AddField(
            model_name='order',
            name='platform_fee_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='order',
            name='instructor_earning_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.RunPython(backfill_revenue_split, migrations.RunPython.noop),
    ]
