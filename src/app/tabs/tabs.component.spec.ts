import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsService } from './tabs.service';
import { UtilsService } from '@services/utils.service';
import { BrowserStorageService } from '@services/storage.service';
import { SwitcherService } from '../switcher/switcher.service';
import { ReviewsService } from '../reviews/reviews.service';
import { Router } from '@angular/router';
import { SharedService } from '@services/shared.service';
import { NewRelicService } from '@shared/new-relic/new-relic.service';
import { Observable, of, pipe, throwError } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { TabsComponent } from './tabs.component';
import { ModalController } from '@ionic/angular';
import { MockRouter } from '@testing/mocked.service';

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;
  let tabsSpy: jasmine.SpyObj<TabsService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let storageSpy: jasmine.SpyObj<BrowserStorageService>;
  let newRelicSpy: jasmine.SpyObj<NewRelicService>;
  let switcherSpy: jasmine.SpyObj<SwitcherService>;
  let reviewsSpy: jasmine.SpyObj<ReviewsService>;
  let utils: UtilsService;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientModule ],
      declarations: [ TabsComponent ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
      providers: [
        UtilsService,
        {
          provide: ModalController,
          useValue: {
            dismiss: jasmine.createSpy('dismiss')
          }
        },
        {
          provide: TabsService,
          useValue: jasmine.createSpyObj('TabsService', ['getNoOfChats', 'getNoOfTodoItems'])
        },
        {
          provide: BrowserStorageService,
          // we've already used BrowserStorageService in the constructor(), so we have to mock the return data when defined
          useValue: jasmine.createSpyObj('BrowserStorageService', {
            getUser: {
              role: 'participant',
              teamId: 1,
              name: 'Test User',
              email: 'user@test.com',
              id: 1
            }
          })
        },
        {
          provide: NewRelicService,
          useValue: jasmine.createSpyObj('NewRelicService', ['setPageViewName', 'actionText', 'noticeError'])
        },
        {
          provide: SwitcherService,
          useValue: jasmine.createSpyObj('SwitcherService', ['getTeamInfo'])
        },
        {
          provide: ReviewsService,
          useValue: jasmine.createSpyObj('ReviewsService', ['getReviews'])
        },
        {
          provide: Router,
          useClass: MockRouter
        },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    tabsSpy = TestBed.get(TabsService);
    routerSpy = TestBed.get(Router);
    utils = TestBed.get(UtilsService);
    storageSpy = TestBed.get(BrowserStorageService);
    newRelicSpy = TestBed.get(NewRelicService);
    switcherSpy = TestBed.get(SwitcherService);
    reviewsSpy = TestBed.get(ReviewsService);
    switcherSpy.getTeamInfo.and.returnValue(of(''));
    reviewsSpy.getReviews.and.returnValue(of(['', '']));
    tabsSpy.getNoOfChats.and.returnValue(of(4));
    tabsSpy.getNoOfTodoItems.and.returnValue(of(5));
    component.routeUrl = '/test';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when testing constructor()', () => {
    it('should get correct event data', () => {
      expect(component.noOfTodoItems).toBe(0);
      expect(component.noOfChats).toBe(0);
      utils.broadcastEvent('notification', '');
      expect(component.noOfTodoItems).toBe(1);
      utils.broadcastEvent('event-reminder', '');
      expect(component.noOfTodoItems).toBe(2);
      tabsSpy.getNoOfChats.and.returnValue(of(3));
      utils.broadcastEvent('team-message', '');
      expect(component.noOfChats).toBe(3);
      tabsSpy.getNoOfChats.and.returnValue(of(4));
      utils.broadcastEvent('team-no-mentor-message', '');
      expect(component.noOfChats).toBe(4);
    });
  });

  describe('when testing onEnter()', () => {
    it('should get correct data', () => {
      fixture.detectChanges();
      expect(component.noOfTodoItems).toBe(5);
      expect(component.noOfChats).toBe(4);
      expect(component.showChat).toBe(true);
      expect(component.showReview).toBe(true);
    });

    it('should get correct data without team id', () => {
      storageSpy.getUser.and.returnValue({
        role: 'participant',
        teamId: null,
        name: 'Test User',
        email: 'user@test.com',
        id: 1
      });
      reviewsSpy.getReviews.and.returnValue(of([]));
      fixture.detectChanges();
      expect(component.noOfChats).toBe(0);
      expect(component.showChat).toBe(false);
      expect(component.showReview).toBe(false);
    });
  });

  describe('when testing _checkRoute()', () => {
    it('should select home tab', () => {
      // spyOnProperty(routerSpy, 'url', 'get').and.returnValue('/app/home');
      // expect(component.selectedTab).toEqual('home');
    });
  });
});
