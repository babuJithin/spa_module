/* @odoo-module */
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { onMounted, onWillStart, Component, useState } from "@odoo/owl";

class FullCalendar extends Component {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.action = useService("action");
        this.current_branch = '';
        this.current_employee = '';
        this.current_service = '';
        this.state = useState({
            events: [], resources: [], branches: [], services: [], employees: []
        });

        onWillStart(async () => {
            const res = await this.fetchData();
            this.state.events = res.bookings;
            this.state.resources = res.resources;
            this.state.branches = res.branches;
            this.state.services = res.services;
            this.state.employees = res.employees;
            // remember selectors
            this.current_branch = $('#branch_selector').val() || '';
            this.current_employee = $('#employee_selector').val() || '';
            this.current_service = $('#service_selector').val() || '';
        });

        onMounted(() => {
            // restore selector values and fire native change
            if (this.current_branch) {
                $('#branch_selector').val(this.current_branch).trigger('change');
            }
            if (this.current_employee) {
                $('#employee_selector').val(this.current_employee).trigger('change');
            }
            if (this.current_service) {
                $('#service_selector').val(this.current_service).trigger('change');
            }
            // bind change
            $('#service_selector').on('change', e => this.onSelectionChange(e));
            setTimeout(() => this.initializeCalendar(), 300);
        });
    }

    async fetchData() {
        let branch = $('#branch_selector').val() || 'all';
        let employee = $('#employee_selector').val() || 'all';
        let service_tmpl_id = $('#service_selector option:selected').data('tmpl_id') || '0';
        return await this.orm.call('spa.booking', 'get_calendar_data',
            [branch, employee, service_tmpl_id], {});
    }

    initializeCalendar() {
        const scroll_time = new Date(Date.now() - 30 * 60 * 1000);
        $('#calendar').fullCalendar({
            scrollTime: `${scroll_time.getHours()}:${scroll_time.getMinutes()}`,
            slotDuration: '00:30',
            defaultView: 'agendaDay',
            defaultDate: this.state.date,
            editable: true,
            eventStartEditable: false,
            eventDurationEditable: false,
            selectable: true,
            selectHelper: true,
            unselectAuto: false,
            eventLimit: true,
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'agendaDay,agendaWeek,month,listWeek',
            },
            views: { day: { titleFormat: 'dddd, MMMM Do - YYYY' } },
            resources: this.state.resources,
            events: this.state.events,
            selectConstraint: 'businessHours',
            select: (start, end, jsEvent, view, resource) => {
                if (view.name === 'agendaDay') {
                    this.action.doAction({
                        type: 'ir.actions.act_window',
                        name: 'Booking',
                        res_model: 'spa.booking',
                        views: [[false, 'form']],
                        target: 'new',
                        context: {
                            default_date: start.format(),
                            default_employee_id: resource ? +resource.id : 0,
                            default_time_from: `${start.hour()}:${start.minute()}`,
                            default_product_id: +$('#service_selector').val() || false,
                            default_branch_id: +$('#branch_selector').val() || false,
                            show_footer: 1,
                            calendar_booking: true,
                        },
                    });
                }
            },
            dayClick: (date, jsEvent, view, resource) => {
                if (['agendaWeek','month'].includes(view.name)) {
                    $('#calendar').fullCalendar('changeView','agendaDay');
                    $('#calendar').fullCalendar('gotoDate', date);
                }
            },
            eventClick: (calEvent) => {
                if (!calEvent.leave) {
                    this.action.doAction({
                        name: 'Reservation Details',
                        type: 'ir.actions.act_window',
                        res_model: 'spa.booking',
                        res_id: calEvent.id,
                        views: [[false,'form']],
                        target: 'new',
                        context: { calendar_booking: true, show_footer: true },
                    });
                }
            },
            schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source',
        });
    }

    async onSelectionChange() {
        const res = await this.fetchData();
        this.state.employees = res.employees;
        this.state.events    = res.bookings;
        this.state.resources = res.resources;
        // update existing calendar
        $('#calendar').fullCalendar('removeEvents');
        $('#calendar').fullCalendar('addEventSource', this.state.events);
        const current = $('#calendar').fullCalendar('getResources');
        current.forEach(r => $('#calendar').fullCalendar('removeResource', r.id));
        this.state.resources.forEach(r => $('#calendar').fullCalendar('addResource', r));
    }
}
FullCalendar.template = 'booking_calendar_template';
registry.category('actions').add('calendar_booking', FullCalendar);
