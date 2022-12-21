# Twitter Contest V1
Every contestant enters a stake. If they break their tweeting streak during the contest, they lose their stake. If they maintain their streak, they get a percent of the total losers' stakes plus their own stake once the contest ends.

## features
- entry fee in usdc or other stablecoin
- twitter handle string entered when person calls register function
- ppl who enter stake an amount
- ppl who don't maintain streak lose stake
- protocol takes percent of total losers' stakes
- ppl who maintain streak get a percent of total losers' stakes
- losers and streak maintainers determined using tellor

## setup

# todo
## frontend
- connect metamask to app
- able to call functions from frontend

## contract
- implement general protocol fee part (upon user registration)
- implement reward given to ppl who claim losers

## tellor integration
- make dataspec for TwitterContestV1 query type
- maybe make a script for checking if the user has kept their streak given the contest params

