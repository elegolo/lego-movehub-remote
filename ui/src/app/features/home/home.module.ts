import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatSliderModule,
    MatToolbarModule
} from '@angular/material';
import { KnobModule } from 'angular4-knob';

import { ConnectDialogModule } from '../connect-dialog/connect-dialog.module';
import { MovehubModule } from '../movehub/movehub.module';
import { HomeComponent } from './home.component';

@NgModule({
    imports: [
        MovehubModule,
        ConnectDialogModule,
        KnobModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatSliderModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDialogModule,
        FlexLayoutModule,
        ReactiveFormsModule,
        FormsModule,
        CommonModule
    ],
    declarations: [HomeComponent],
    exports: [HomeComponent],
    entryComponents: [HomeComponent]
})
export class HomeModule {}
