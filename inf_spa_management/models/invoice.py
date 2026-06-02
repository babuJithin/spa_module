# -*- coding: utf-8 -*-

from odoo import api, fields, models


class AccountMove(models.Model):
    _inherit = "account.move"

    booking_ids = fields.One2many('spa.booking', 'invoice_id', string="Bookings")
    branch_id = fields.Many2one('spa.branch', string="Branch")

    @api.model
    def default_get(self, fields):
        res = super(AccountMove, self).default_get(fields)
        if 'branch_id' not in res:
            res['branch_id'] = self.env.user.branch_id.id or False
        return res

    def action_invoice_register_payment(self):
        ctx = {
            'default_booking_id': self.booking_ids[:1].id,
            'default_branch_id': self.branch_id.id,
        }
        self = self.with_context(**ctx)
        return super(AccountMove, self).action_invoice_register_payment()

    def add_wallet_payment_line(self, amount):
        self.ensure_one()

        wallet_product = self.env.ref(
            'inf_spa_management.product_wallet_payment',
            raise_if_not_found=False
        )
        if not wallet_product:
            return False
        account = (
                wallet_product.property_account_income_id
                or wallet_product.categ_id.property_account_income_categ_id
        )

        if not account:
            return False

        self.write({
            'invoice_line_ids': [(0, 0, {
                'product_id': wallet_product.id,
                'name': 'Wallet Payment',
                'quantity': 1,
                'price_unit': amount,
                'account_id': account.id,
            })]
        })

        return True


class CustomAccountMoveLine(models.Model):
    _inherit = 'account.move.line'

    employee_id = fields.Many2one(
        related='sale_line_ids.employee_id',
        string="Beautician",
        store=True,
        readonly=True
    )
